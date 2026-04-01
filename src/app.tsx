import { Outlet } from "react-router-dom";

export function App() {
  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased">
      <Outlet />
    </div>
  );
}
