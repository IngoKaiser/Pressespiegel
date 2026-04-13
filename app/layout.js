import './globals.css';

export const metadata = {
  title: 'Pressespiegel',
  description: 'Dein persönlicher Nachrichtenüberblick',
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
