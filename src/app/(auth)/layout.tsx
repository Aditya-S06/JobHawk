export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            J
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold">JobHawk</div>
            <div className="text-xs text-muted-foreground">AI Career Coach</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
