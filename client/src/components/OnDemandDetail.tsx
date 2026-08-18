import React, { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function OnDemandDetail({ title, description, triggerLabel = "Details", children }: { title: string; description?: string; triggerLabel?: string; children: ReactNode }) {
  return <Dialog>
    <DialogTrigger asChild><button className="detail-trigger" type="button"><span>{triggerLabel}</span><ChevronRight size={14} /></button></DialogTrigger>
    <DialogContent className="detail-dialog">
      <DialogHeader><DialogTitle>{title}</DialogTitle>{description && <DialogDescription>{description}</DialogDescription>}</DialogHeader>
      <div className="detail-dialog-body">{children}</div>
    </DialogContent>
  </Dialog>;
}
