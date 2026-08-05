"use client";

import { useEffect, useState } from "react";
import { share, SharePayload, whatsappUrl } from "@/lib/share";

interface Props {
  payload: SharePayload;
}

// WhatsApp + native share sheet (or copy link where there's no sheet).
// Used on the pin and To-Let cards so people can send a spot to friends.
export default function ShareRow({ payload }: Props) {
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const handleShare = async () => {
    const result = await share(payload);
    if (result === "copied") setCopied(true);
  };

  return (
    <div className="flex gap-1.5">
      <a
        href={whatsappUrl(payload)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition hover:brightness-95"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.11 3.22 5.1 4.51.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35zM12.05 21.6h-.01a9.53 9.53 0 0 1-4.86-1.33l-.35-.2-3.61.94.97-3.52-.23-.36a9.55 9.55 0 1 1 8.09 4.47zM12.05 1A11.04 11.04 0 0 0 2.5 17.56L1 23l5.57-1.46A11.03 11.03 0 1 0 12.05 1z" />
        </svg>
        WhatsApp
      </a>
      <button
        onClick={handleShare}
        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        {copied ? "✓ Link copied" : canNativeShare ? "Share… 📤" : "Copy link 🔗"}
      </button>
    </div>
  );
}
