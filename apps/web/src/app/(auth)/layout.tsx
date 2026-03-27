export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary-700">Dentiqa</h1>
          <p className="text-muted-foreground mt-1">Plataforma para clínicas dentales</p>
        </div>
        {children}
      </div>
    </div>
  );
}
