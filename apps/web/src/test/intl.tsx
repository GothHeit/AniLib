import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import auth from "../../messages/en/auth.json";
import common from "../../messages/en/common.json";
import nav from "../../messages/en/nav.json";

function Providers({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={{ ...common, ...nav, ...auth }}>
      {children}
    </NextIntlClientProvider>
  );
}

/** Renders with the real English messages. */
export function renderIntl(ui: ReactElement) {
  return render(ui, { wrapper: Providers });
}
