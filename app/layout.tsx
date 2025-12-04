import "../styles/globals.css";
import { Viewport, Metadata } from "next";

export const metadata: Metadata = {
  title: "Figment Transaction Decoder",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width, initial-scale=1.0",
};

const Layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en" className="overflow-x-hidden">
      <body className="overflow-x-hidden">
        <main className="flex flex-col w-full h-full min-h-screen overflow-x-hidden mx-auto">
          {children}
        </main>
      </body>
    </html>
  );
};

export default Layout;
