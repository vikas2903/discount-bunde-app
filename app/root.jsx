import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError,
} from "react-router";

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `Shopify returned ${error.status}: ${error.statusText || "Unable to open this page"}.`
    : "The app could not load. Please reopen it from Shopify Admin.";

  console.error("[app] Unhandled route error", error);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <main style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
          <h1>Unable to load Discount bundle App</h1>
          <p>{message}</p>
          <p>Please reopen the app from Shopify Admin. If this continues, check the Railway deployment logs.</p>
        </main>
        <Scripts />
      </body>
    </html>
  );
}
