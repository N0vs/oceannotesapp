import './globals.css';

export const metadata = {
  title: 'OceanNotes',
  description: 'Sua plataforma de anotações sobre o oceano.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
