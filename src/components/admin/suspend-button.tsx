'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type Props = {
  userId: string;
  isSuspended: boolean;
  labelSuspend: string;
  labelUnsuspend: string;
  labelWorking: string;
  confirmSuspend: string;
  confirmUnsuspend: string;
};

export default function SuspendButton({
  userId,
  isSuspended,
  labelSuspend,
  labelUnsuspend,
  labelWorking,
  confirmSuspend,
  confirmUnsuspend,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    const message = isSuspended ? confirmUnsuspend : confirmSuspend;
    if (!window.confirm(message)) return;

    setLoading(true);
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSuspended: !isSuspended }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isSuspended ? 'outline' : 'destructive'}
      size="sm"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? labelWorking : isSuspended ? labelUnsuspend : labelSuspend}
    </Button>
  );
}
