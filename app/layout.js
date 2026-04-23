import './globals.css';

export const metadata = {
  title: 'Pressespiegel',
  description: 'Dein persönlicher Nachrichtenüberblick',
  viewport: 'width=device-width, initial-scale=1',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon-192.png',
    apple: '/favicon-192.png',
  },
  themeColor: '#f5f5f5',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
