"use client";

import Image from "next/image";
import { useState } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { shallow, useOthersMapped } from "@liveblocks/react/suspense";

type ParticipantInfo = Liveblocks["UserMeta"]["info"];

export function participantInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return `${words[0][0]}${words.length > 1 ? words.at(-1)![0] : ""}`.toUpperCase();
}

export function CollaboratorAvatar({ info }: { info: ParticipantInfo }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const name = info.name || "Collaborator";
  return <span role="img" aria-label={name} title={name}
    className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-elevated text-[10px] font-semibold text-copy-primary ring-2 ring-surface-border">
    {info.avatar && info.avatar !== failedImage ? <Image src={info.avatar} alt="" fill sizes="32px" unoptimized className="object-cover" onError={() => setFailedImage(info.avatar)} /> : participantInitials(name)}
  </span>;
}

export function CanvasParticipants() {
  const { userId } = useAuth();
  const others = useOthersMapped((other) => ({ id: other.id, info: other.info }), shallow);
  const collaborators = userId ? others.filter(([, other]) => other.id !== userId) : [];
  const visible = collaborators.slice(0, 5);
  const overflow = collaborators.length - visible.length;

  return <div aria-label="Room participants" className="nodrag nopan nowheel absolute right-6 top-6 z-30 flex items-center gap-3 rounded-full border border-surface-border bg-surface/90 p-2 shadow-lg">
    {collaborators.length > 0 && <>
      <div className="flex items-center -space-x-2">
        {visible.map(([connectionId, other]) => <CollaboratorAvatar key={connectionId} info={other.info} />)}
        {overflow > 0 && <span role="img" aria-label={`${overflow} more collaborators`} title={collaborators.slice(5).map(([, other]) => other.info.name).join(", ")}
          className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-elevated text-[10px] font-medium text-copy-secondary ring-2 ring-surface-border">+{overflow}</span>}
      </div>
      <span data-participant-divider aria-hidden="true" className="h-6 w-px bg-surface-border" />
    </>}
    <UserButton appearance={{ elements: { avatarBox: "size-8", userButtonTrigger: "size-8" } }} />
  </div>;
}
