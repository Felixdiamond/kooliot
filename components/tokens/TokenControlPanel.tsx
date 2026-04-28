'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Sparkles } from 'lucide-react';

import { generateTokenAction } from '@/lib/actions/generateToken';
import { useToast } from '@/components/ui/toaster';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface TokenControlPanelProps {
  deviceId: number;
  isViewer: boolean;
}

type TokenType = 'ACTIVATE' | 'SET_TIME' | 'ADD_TIME' | 'DISABLE';

function formatTokenForDisplay(token: string): string {
  return token.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
}

export function TokenControlPanel({ deviceId, isViewer }: TokenControlPanelProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [tokenType, setTokenType] = useState<TokenType>('ACTIVATE');
  const [days, setDays] = useState('30');
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isDisableToken = tokenType === 'DISABLE';
  const isActivateToken = tokenType === 'ACTIVATE';

  const handleGenerate = () => {
    if (isViewer) {
      return;
    }

    setError('');
    setCopied(false);
    setGeneratedToken(null);

    const parsedDays = Number(days);
    if (!isDisableToken && (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 995)) {
      setError('Value must be an integer between 1 and 995.');
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set('deviceId', String(deviceId));
      formData.set('tokenType', tokenType);
      formData.set('value', isDisableToken ? '1' : String(parsedDays));

      const result = await generateTokenAction(formData);
      if (!result.success || !result.token) {
        const msg = result.error ?? 'Failed to generate token';
        setError(msg);
        toast('error', msg);
        return;
      }

      setGeneratedToken(result.token);
      toast('success', 'Token generated successfully');
      router.refresh();
    });
  };

  const handleCopy = async () => {
    if (!generatedToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedToken);
      setCopied(true);
      toast('success', 'Token copied to clipboard');
    } catch {
      toast('error', 'Unable to copy token to clipboard.');
    }
  };

  return (
    <div className="surface-card relative overflow-hidden p-6">
      <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-tertiary/30 bg-tertiary/16 text-foreground">
        <Sparkles size={16} strokeWidth={2.25} />
      </div>

      <h3 className="font-heading mb-6 text-lg font-semibold text-foreground">
        Token Control
      </h3>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Token Type
          </label>
          <select
            value={tokenType}
            onChange={(e) => setTokenType(e.target.value as TokenType)}
            disabled={isViewer || isPending}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm transition-all duration-200 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="ACTIVATE">ACTIVATE</option>
            <option value="SET_TIME">SET_TIME</option>
            <option value="ADD_TIME">ADD_TIME</option>
            <option value="DISABLE">DISABLE</option>
          </select>
        </div>

        {!isDisableToken && (
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={isViewer || isPending}
            min="1"
            max="995"
            label={isActivateToken ? 'Activation Days' : tokenType === 'SET_TIME' ? 'Days to Set' : 'Days to Add'}
          />
        )}

        {isDisableToken && (
          <p className="text-xs font-medium text-muted-foreground">
            DISABLE generates a kill token and ignores day values.
          </p>
        )}

        {isActivateToken && (
          <p className="text-xs font-medium text-muted-foreground">
            ACTIVATE maps to OpenPAYGO SET_TIME and restores credit with the specified days.
          </p>
        )}

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleGenerate}
          disabled={isViewer || isPending}
          isLoading={isPending}
        >
          <Sparkles size={18} strokeWidth={2.5} className="mr-2" />
          Generate Token
        </Button>

        {isViewer && (
          <p className="text-xs font-medium text-muted-foreground">
            VIEWER role cannot generate tokens.
          </p>
        )}

        {error ? <p className="text-xs font-medium text-status-error">{error}</p> : null}

        {generatedToken && (
          <div className="rounded-lg border border-primary/25 bg-primary/8 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Generated Token
            </div>
            <div className="font-mono-data mb-3 text-xl font-semibold tracking-[0.16em] text-foreground">
              {formatTokenForDisplay(generatedToken)}
            </div>
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check size={14} strokeWidth={2.5} className="mr-2" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={2.5} className="mr-2" />
                  Copy Token
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
