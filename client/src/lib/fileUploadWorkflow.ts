export type PreparedUpload = { key: string; objectUrl: string; uploadUrl: string };

export async function runFileUploadWorkflow({
  file,
  prepare,
  transfer,
  complete,
  onPreparing,
  onUploading,
  onFinalizing,
}: {
  file: File;
  prepare: () => Promise<PreparedUpload>;
  transfer: (prepared: PreparedUpload) => Promise<void>;
  complete: (prepared: PreparedUpload) => Promise<void>;
  onPreparing: () => void;
  onUploading: () => void;
  onFinalizing: () => void;
}) {
  onPreparing();
  const prepared = await prepare();
  onUploading();
  await transfer(prepared);
  onFinalizing();
  await complete(prepared);
  return prepared;
}
