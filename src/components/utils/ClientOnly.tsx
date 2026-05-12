'use client';

import React, { useEffect, useState } from 'react';

export default function ClientOnly({ children }: { children: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="h-full flex items-center justify-center text-white bg-[#313338]">Loading...</div>;
  }

  return <>{children}</>;
}
