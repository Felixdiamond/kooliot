'use client';

import { FormEvent, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  completeAssignmentTaskAction,
  deleteAssignmentTaskAction,
} from '@/lib/actions/assignmentTasks';
import {
  DevicePickerModal,
  type DevicePickerItem,
} from '@/components/device/device-picker-modal';
import { formatBoardTypeLabel, normalizeBoardType } from '@/lib/domain/boards';
import { Button } from '@/components/ui/Button';

type OpenTask = {
  id: number;
  createdBy: number;
  createdByName: string;
  requestedBoardType: string | null;
  preferredIdentifier: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerLocation: string | null;
  notes: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type FreeDevice = {
  id: number;
  serialNumber: string;
  boardType: string | null;
  angazaId: string | null;
  paygoId: string | null;
  productType: string | null;
};

type ManagerTaskPanelProps = {
  tasks: OpenTask[];
  freeDevices: FreeDevice[];
};

function formatPayload(payload: Record<string, unknown> | null): string[] {
  if (!payload) {
    return [];
  }

  return Object.entries(payload)
    .map(([key, value]) => {
      if (key === 'selectedDeviceId') {
        return '';
      }

      if (value === null || value === undefined || String(value).trim() === '') {
        return '';
      }
      const label = key.replace(/[_-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
      return `${label}: ${String(value)}`;
    })
    .filter(Boolean);
}

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

function devicesForTask(task: OpenTask, freeDevices: FreeDevice[]): FreeDevice[] {
  const requested = normalizeBoardType(task.requestedBoardType);

  return freeDevices.filter((device) => {
    if (!requested) {
      return true;
    }

    return normalizeBoardType(device.boardType) === requested;
  });
}

function resolveDeviceSelection(
  task: OpenTask,
  taskDevices: FreeDevice[],
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

export function ManagerTaskPanel({ tasks, freeDevices }: ManagerTaskPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Record<number, { text: string; error: boolean }>>({});
  const [pickerTaskId, setPickerTaskId] = useState<number | null>(null);
  const [selectedDeviceByTask, setSelectedDeviceByTask] = useState<Record<number, number>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function onAssign(taskId: number, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const selectedDeviceId = Number(formData.get('deviceId'));

    if (!Number.isInteger(selectedDeviceId) || selectedDeviceId <= 0) {
      setMessages((prev) => ({
        ...prev,
        [taskId]: { text: 'Select a device ID before registering the board.', error: true },
      }));
      return;
    }

    startTransition(async () => {
      const result = await completeAssignmentTaskAction(formData);
      setMessages((prev) => ({
        ...prev,
        [taskId]: { text: result.message, error: !result.success },
      }));

      if (result.success) {
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
      setMessages((prev) => ({
        ...prev,
        [taskId]: { text: result.message, error: !result.success },
      }));

      if (result.success) {
        router.refresh();
      }
    });
  }

  const activePickerTask = useMemo(
    () => tasks.find((task) => task.id === pickerTaskId) ?? null,
    [tasks, pickerTaskId]
  );

  const activePickerDevices = useMemo(
    () => (activePickerTask ? devicesForTask(activePickerTask, freeDevices) : []),
    [activePickerTask, freeDevices]
  );

  const activePickerSelectedId = useMemo(() => {
    if (!activePickerTask) {
      return null;
    }

    return resolveDeviceSelection(activePickerTask, activePickerDevices, selectedDeviceByTask);
  }, [activePickerTask, activePickerDevices, selectedDeviceByTask]);

  return (
    <div className="surface-card p-6">
      <h2 className="font-heading mb-2 text-xl font-semibold text-foreground">Registration And Assignment Queue</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Register boards from open requests, pick IDs with search, and delete stale open tasks when needed.
      </p>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open assignment tasks.</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const taskDevices = devicesForTask(task, freeDevices);
            const payloadEntries = formatPayload(task.payload ?? null);
            const payloadSelectedDeviceId = readSelectedDeviceId(task.payload ?? null);
            const selectedDeviceId = resolveDeviceSelection(task, taskDevices, selectedDeviceByTask);
            const selectedDevice =
              taskDevices.find((device) => device.id === selectedDeviceId) ?? null;
            const taskMessage = messages[task.id];

            return (
              <form
                key={task.id}
                onSubmit={(event) => onAssign(task.id, event)}
                className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4"
              >
                <input type="hidden" name="taskId" value={task.id} />

                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                  <div>
                    <p className="font-bold text-foreground">{task.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      Requested by {task.createdByName} • {new Date(task.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested board: {formatBoardTypeLabel(task.requestedBoardType)}
                    </p>
                    {payloadSelectedDeviceId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Viewer selected device ID: #{payloadSelectedDeviceId}
                        {taskDevices.some((device) => device.id === payloadSelectedDeviceId)
                          ? ''
                          : ' (not available now)'}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {task.customerPhone ? (
                    <p>
                      <span className="text-muted-foreground">Phone:</span> {task.customerPhone}
                    </p>
                  ) : null}
                  {task.customerEmail ? (
                    <p>
                      <span className="text-muted-foreground">Email:</span> {task.customerEmail}
                    </p>
                  ) : null}
                  {task.customerLocation ? (
                    <p>
                      <span className="text-muted-foreground">Location:</span> {task.customerLocation}
                    </p>
                  ) : null}
                  {task.preferredIdentifier ? (
                    <p>
                      <span className="text-muted-foreground">Identifier:</span> {task.preferredIdentifier}
                    </p>
                  ) : null}
                </div>

                {task.notes ? <p className="text-sm text-muted-foreground">{task.notes}</p> : null}

                {payloadEntries.length > 0 ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {payloadEntries.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                ) : null}

                {taskDevices.length === 0 ? (
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <p className="text-sm text-status-error">
                      No free {formatBoardTypeLabel(task.requestedBoardType)} boards available.
                    </p>
                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Delete this task?</span>
                        <Button type="button" variant="danger" size="sm" disabled={isPending} isLoading={isPending} onClick={() => onConfirmDelete(task.id)}>
                          Confirm
                        </Button>
                        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        disabled={isPending}
                        onClick={() => onDeleteTask(task.id)}
                      >
                        Delete Task
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-3 md:items-end">
                    <div className="flex-1">
                      <label className="block mb-2 text-xs font-bold uppercase tracking-wide text-foreground">
                        Select Free Board ID
                      </label>
                      <input
                        type="hidden"
                        name="deviceId"
                        required
                        value={selectedDeviceId ?? ''}
                        readOnly
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        className="w-full justify-between"
                        onClick={() => setPickerTaskId(task.id)}
                        disabled={isPending}
                      >
                        {selectedDevice
                          ? `#${selectedDevice.id} - ${selectedDevice.serialNumber}`
                          : 'Pick Device ID'}
                      </Button>
                    </div>
                    <div className="flex gap-2 md:self-end">
                      <Button
                        type="submit"
                        disabled={isPending || !selectedDeviceId}
                        isLoading={isPending}
                      >
                        Register Board
                      </Button>
                      {confirmDeleteId === task.id ? (
                        <>
                          <span className="self-center text-xs text-muted-foreground">Delete?</span>
                          <Button type="button" variant="danger" size="sm" disabled={isPending} isLoading={isPending} onClick={() => onConfirmDelete(task.id)}>
                            Confirm
                          </Button>
                          <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={isPending}
                          onClick={() => onDeleteTask(task.id)}
                        >
                          Delete Task
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {taskMessage ? (
                  <p className={`text-sm font-medium ${taskMessage.error ? 'text-status-error' : 'text-status-active'}`}>
                    {taskMessage.text}
                  </p>
                ) : null}
              </form>
            );
          })}
        </div>
      )}

      <DevicePickerModal
        open={pickerTaskId !== null}
        title={
          activePickerTask
            ? `Select Device ID For ${activePickerTask.customerName}`
            : 'Select Device ID'
        }
        devices={activePickerDevices as DevicePickerItem[]}
        selectedDeviceId={activePickerSelectedId}
        onClose={() => setPickerTaskId(null)}
        onSelect={(deviceId) => {
          if (!pickerTaskId) {
            return;
          }

          setSelectedDeviceByTask((prev) => ({
            ...prev,
            [pickerTaskId]: deviceId,
          }));
        }}
        emptyMessage="No free boards available for this request."
      />
    </div>
  );
}
