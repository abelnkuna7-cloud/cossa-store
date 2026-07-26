import type { ReactNode } from "react";

import { PageHeader } from "./PageHeader";

export interface PolicySection {
  heading: string;
  body: string[];
}

export function PolicyPage({
  eyebrow,
  title,
  description,
  sections,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  sections: PolicySection[];
  footer?: ReactNode;
}) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-display text-xl font-semibold">{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>
        {footer ? <div className="mt-10">{footer}</div> : null}
      </div>
    </div>
  );
}
