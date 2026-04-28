'use client';

import { useMemo, useState, useTransition } from 'react';
import { LocateFixed } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  completeAssignmentTaskAction,
  createAssignmentTaskAction,
  deleteAssignmentTaskAction,
} from '@/lib/actions/assignmentTasks';
import { formatBoardTypeLabel, normalizeBoardType } from '@/lib/domain/boards';
import {
  DevicePickerModal,
  type DevicePickerItem,
} from '@/components/device/device-picker-modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type ViewerTask = {
  id: number;
  status: string;
  requestedBoardType: string | null;
  preferredIdentifier: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerLocation: string | null;
  notes: string | null;
  payload: Record<string, unknown> | null;
  assignedDeviceSerial: string | null;
  createdAt: string;
  completedAt: string | null;
};

type ViewerTaskPanelProps = {
  tasks: ViewerTask[];
  freeDevices: DevicePickerItem[];
};

function readSelectedDeviceId(payload: Record<string, unknown> | null): number | null {
  if (!payload) {
    return null;
  }

  const raw = payload.selectedDeviceId;

  if (typeof raw === 'number' && Number.isInteger(raw) && raw > 0) {
    return raw;
  }

  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function devicesForTask(task: ViewerTask, freeDevices: DevicePickerItem[]): DevicePickerItem[] {
  const requested = normalizeBoardType(task.requestedBoardType);

  return freeDevices.filter((device) => {
    if (!requested) {
      return true;
    }

    return normalizeBoardType(device.boardType) === requested;
  });
}

function resolveDeviceSelection(
  task: ViewerTask,
  taskDevices: DevicePickerItem[],
  selectedDeviceByTask: Record<number, number>
): number | null {
  const selectedByUser = selectedDeviceByTask[task.id];

  if (selectedByUser && taskDevices.some((device) => device.id === selectedByUser)) {
    return selectedByUser;
  }

  const selectedFromPayload = readSelectedDeviceId(task.payload ?? null);

  if (selectedFromPayload && taskDevices.some((device) => device.id === selectedFromPayload)) {
    return selectedFromPayload;
  }

  return taskDevices[0]?.id ?? null;
}

export function ViewerTaskPanel({ tasks, freeDevices }: ViewerTaskPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [taskMessages, setTaskMessages] = useState<
    Record<number, { text: string; error: boolean }>
  >({});
  const [requestedBoardType, setRequestedBoardType] = useState<'PAYGO' | 'CLOUD_SOLAR'>(
    'PAYGO'
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [registerPickerTaskId, setRegisterPickerTaskId] = useState<number | null>(null);
  const [selectedRegistrationDeviceByTask, setSelectedRegistrationDeviceByTask] = useState<
    Record<number, number>
  >({});
  const [gpsLatitude, setGpsLatitude] = useState('');
  const [gpsLongitude, setGpsLongitude] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [geoMessage, setGeoMessage] = useState('');
  const [todayDefault] = useState(() => new Date().toISOString().slice(0, 10));
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const pickerDevices = useMemo(
    () =>
      freeDevices.filter(
        (device) => normalizeBoardType(device.boardType) === requestedBoardType
      ),
    [freeDevices, requestedBoardType]
  );

  const effectiveSelectedDeviceId = useMemo(() => {
    if (!selectedDeviceId) {
      return null;
    }

    return pickerDevices.some((device) => device.id === selectedDeviceId)
      ? selectedDeviceId
      : null;
  }, [pickerDevices, selectedDeviceId]);

  const selectedDevice = useMemo(
    () => pickerDevices.find((device) => device.id === effectiveSelectedDeviceId) ?? null,
    [pickerDevices, effectiveSelectedDeviceId]
  );

  function captureCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoMessage('Geolocation is not supported in this browser.');
      return;
    }

    setIsLocating(true);
    setGeoMessage('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsLatitude(position.coords.latitude.toFixed(6));
        setGpsLongitude(position.coords.longitude.toFixed(6));
        setGeoMessage('Current location captured.');
        setIsLocating(false);
      },
      (error) => {
        if (error.code === 1) {
          setGeoMessage('Location permission denied.');
        } else if (error.code === 2) {
          setGeoMessage('Unable to read your current location.');
        } else {
          setGeoMessage('Location request timed out.');
        }
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  }

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAssignmentTaskAction(formData);
      setIsError(!result.success);
      setMessage(result.message);

      if (result.success) {
        setSelectedDeviceId(null);
        setGpsLatitude('');
        setGpsLongitude('');
        setGeoMessage('');
        router.refresh();
      }
    });
  }

  function onDeleteTask(taskId: number) {
    setConfirmDeleteId(taskId);
  }

  function onConfirmDelete(taskId: number) {
    setConfirmDeleteId(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set('taskId', String(taskId));

      const result = await deleteAssignmentTaskAction(formData);
      setTaskMessages((prev) => ({
        ...prev,
        [taskId]: { text: result.message, error: !result.success },
      }));

      if (result.success) {
        router.refresh();
      }
    });
  }

  function onRegisterTask(taskId: number, deviceId: number | null) {
    if (!Number.isInteger(deviceId) || !deviceId || deviceId <= 0) {
      setTaskMessages((prev) => ({
        ...prev,
        [taskId]: { text: 'Select a device ID before self-registration.', error: true },
      }));
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('taskId', String(taskId));
      formData.set('deviceId', String(deviceId));

      const result = await completeAssignmentTaskAction(formData);
      setTaskMessages((prev) => ({
        ...prev,
        [taskId]: { text: result.message, error: !result.success },
      }));

      if (result.success) {
        router.refresh();
      }
    });
  }

  const activeRegisterTask = useMemo(
    () => tasks.find((task) => task.id === registerPickerTaskId && task.status === 'OPEN') ?? null,
    [tasks, registerPickerTaskId]
  );

  const activeRegisterDevices = useMemo(
    () => (activeRegisterTask ? devicesForTask(activeRegisterTask, freeDevices) : []),
    [activeRegisterTask, freeDevices]
  );

  const activeRegisterSelectedId = useMemo(() => {
    if (!activeRegisterTask) {
      return null;
    }

    return resolveDeviceSelection(
      activeRegisterTask,
      activeRegisterDevices,
      selectedRegistrationDeviceByTask
    );
  }, [activeRegisterTask, activeRegisterDevices, selectedRegistrationDeviceByTask]);

  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <h2 className="font-heading mb-2 text-xl font-semibold text-foreground">Request Registration / Assignment</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Submit customer details and optional metadata. Viewers can self-register their own open requests, or leave them for managers/admins to process.
        </p>

        <form action={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="customerName"
              label="Customer Name"
              placeholder="e.g. Maryam Usman"
              required
              disabled={isPending}
            />
            <Input
              name="customerPhone"
              label="Customer Phone"
              placeholder="optional"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="email"
              name="customerEmail"
              label="Customer Email"
              placeholder="optional"
              disabled={isPending}
            />
            <Input
              name="customerLocation"
              label="Customer Location"
              placeholder="Town / site"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Requested Board Type
              </label>
              <select
                name="requestedBoardType"
                value={requestedBoardType}
                onChange={(event) =>
                  setRequestedBoardType(event.target.value as 'PAYGO' | 'CLOUD_SOLAR')
                }
                disabled={isPending}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="PAYGO">PAYGO</option>
                <option value="CLOUD_SOLAR">CLOUD_PAYGO</option>
              </select>
            </div>
            <Input
              name="preferredIdentifier"
              label="Preferred Device Identifier"
              placeholder="optional"
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Device ID Selection (Optional)
            </label>
            <input type="hidden" name="selectedDeviceId" value={effectiveSelectedDeviceId ?? ''} />
            <Button
              type="button"
              variant="secondary"
              className="w-full justify-between"
              onClick={() => setIsPickerOpen(true)}
              disabled={isPending || pickerDevices.length === 0}
            >
              {selectedDevice
                ? `#${selectedDevice.id} - ${selectedDevice.serialNumber}`
                : pickerDevices.length === 0
                ? 'No free boards for selected type'
                : 'Pick Device ID'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Viewers, managers, and admins can all use this ID selection workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="pedestalDeviceIdText"
              label="Pedestal Device ID (Text)"
              placeholder="optional"
              disabled={isPending}
            />
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer Gender
              </label>
              <select
                name="customerGender"
                defaultValue=""
                disabled={isPending}
                className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="">Prefer not to say</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="file"
              name="pedestalDeviceIdCamera"
              accept="image/*"
              capture="environment"
              label="Pedestal Device ID Photo (Camera)"
              disabled={isPending}
            />
            <Input
              type="file"
              name="pedestalDeviceIdUpload"
              accept="image/*"
              label="Pedestal Device ID Photo (Upload)"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="gpsLatitude"
              label="GPS Latitude"
              placeholder="optional"
              value={gpsLatitude}
              onChange={(event) => setGpsLatitude(event.target.value)}
              disabled={isPending || isLocating}
            />
            <Input
              name="gpsLongitude"
              label="GPS Longitude"
              placeholder="optional"
              value={gpsLongitude}
              onChange={(event) => setGpsLongitude(event.target.value)}
              disabled={isPending || isLocating}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={captureCurrentLocation}
              disabled={isPending || isLocating}
            >
              <LocateFixed size={16} className="mr-2" />
              {isLocating ? 'Getting Current Location...' : 'Use Current Location'}
            </Button>
            {geoMessage ? (
              <p className="text-xs text-muted-foreground">{geoMessage}</p>
            ) : null}
          </div>

          <Input
            type="date"
            name="assignmentDate"
            label="Assignment Date"
            defaultValue={todayDefault}
            disabled={isPending}
          />

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              disabled={isPending}
              placeholder="Payment confirmation or assignment context"
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Additional Payload (JSON)
            </label>
            <textarea
              name="payload"
              rows={3}
              disabled={isPending}
              placeholder='{"sales_agent": "...", "alt_phone": "..."}'
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            />
          </div>

          <Button type="submit" variant="primary" isLoading={isPending} disabled={isPending}>
            Submit Registration / Assignment Task
          </Button>
        </form>

        <DevicePickerModal
          open={isPickerOpen}
          title="Choose Device ID"
          devices={pickerDevices}
          selectedDeviceId={effectiveSelectedDeviceId}
          onClose={() => setIsPickerOpen(false)}
          onSelect={setSelectedDeviceId}
          emptyMessage="No free boards found for this board type."
        />

        <DevicePickerModal
          open={registerPickerTaskId !== null}
          title={
            activeRegisterTask
              ? `Select Device ID For ${activeRegisterTask.customerName}`
              : 'Select Device ID'
          }
          devices={activeRegisterDevices}
          selectedDeviceId={activeRegisterSelectedId}
          onClose={() => setRegisterPickerTaskId(null)}
          onSelect={(deviceId) => {
            if (!registerPickerTaskId) {
              return;
            }

            setSelectedRegistrationDeviceByTask((prev) => ({
              ...prev,
              [registerPickerTaskId]: deviceId,
            }));
          }}
          emptyMessage="No free boards available for this request."
        />

        {message ? (
          <p className={`mt-4 text-sm font-medium ${isError ? 'text-status-error' : 'text-status-active'}`}>
            {message}
          </p>
        ) : null}
      </div>

      <div className="surface-card p-6">
        <h2 className="font-heading mb-4 text-xl font-semibold text-foreground">My Registration / Assignment Requests</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => {
              const taskMessage = taskMessages[task.id];
              const requestedDeviceId = readSelectedDeviceId(task.payload);
              const taskDevices = devicesForTask(task, freeDevices);
              const selfRegistrationDeviceId = resolveDeviceSelection(
                task,
                taskDevices,
                selectedRegistrationDeviceByTask
              );
              const selfRegistrationDevice = taskDevices.find(
                (device) => device.id === selfRegistrationDeviceId
              );

              return (
                <div key={task.id} className="rounded-lg border border-border/70 bg-muted/20 p-4">
                  {taskMessage ? (
                    <p
                      className={`mb-2 text-sm font-medium ${taskMessage.error ? 'text-status-error' : 'text-status-active'}`}
                    >
                      {taskMessage.text}
                    </p>
                  ) : null}
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-foreground">{task.customerName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBoardTypeLabel(task.requestedBoardType ?? 'PAYGO')} • {new Date(task.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          task.status === 'COMPLETED'
                            ? 'bg-status-active/12 text-status-active'
                            : 'bg-status-warning/18 text-foreground'
                        }`}
                      >
                        {task.status}
                      </span>
                      {task.status === 'OPEN' ? (
                        confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Delete?</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="danger"
                              disabled={isPending}
                              isLoading={isPending}
                              onClick={() => onConfirmDelete(task.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={isPending}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={isPending}
                            onClick={() => onDeleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        )
                      ) : null}
                    </div>
                  </div>

                  {requestedDeviceId ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Requested Device ID: #{requestedDeviceId}
                    </p>
                  ) : null}

                  {task.status === 'OPEN' ? (
                    taskDevices.length === 0 ? (
                      <p className="mt-2 text-xs text-status-error">
                        No free {formatBoardTypeLabel(task.requestedBoardType)} boards available for self registration.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          Auto-selected device:{' '}
                          {selfRegistrationDevice
                            ? `#${selfRegistrationDevice.id} - ${selfRegistrationDevice.serialNumber}`
                            : 'No device selected'}
                        </p>
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <Button
                            type="button"
                            disabled={isPending || !selfRegistrationDeviceId}
                            isLoading={isPending}
                            onClick={() => onRegisterTask(task.id, selfRegistrationDeviceId)}
                          >
                            One-Click Register
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() => setRegisterPickerTaskId(task.id)}
                          >
                            Change Device ID
                          </Button>
                        </div>
                      </div>
                    )
                  ) : null}

                  {task.assignedDeviceSerial ? (
                    <p className="mt-2 text-sm text-foreground">
                      Assigned Board: <span className="font-bold">{task.assignedDeviceSerial}</span>
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
