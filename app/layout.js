import "./globals.css";
import "../legacy/styles/index.css";

export const metadata = {
  title: "Mahavir Hospitality",
  description: "Bill quotation and product catalog system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
