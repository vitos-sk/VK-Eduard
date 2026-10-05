import { Logo } from "@/components/brand/Logo";
import { InfoPage } from "@/components/more/InfoPage";
import { Ticket, TicketBody } from "@/components/ui/ticket";
import { getT } from "@/lib/i18n/server";
import { version } from "../../../../../package.json";

const SECTION_TITLE =
  "mt-2 text-[13px] font-semibold tracking-wide text-ink-3 uppercase";

interface Credit {
  name: string;
  role: string;
  items: string[];
}

function CreditCard({ credit }: { credit: Credit }) {
  return (
    <Ticket compact>
      <TicketBody className="flex flex-col gap-2 py-3">
        <div>
          <p className="text-[16px] font-semibold text-ink">{credit.name}</p>
          <p className="text-[13px] text-ink-2">{credit.role}</p>
        </div>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[14px] leading-snug marker:text-ink-3">
          {credit.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </TicketBody>
    </Ticket>
  );
}

/** «Про додаток»: що це за застосунок і хто його створив — у тому ж порядку, що й у словнику. */
export default async function AboutPage() {
  const t = await getT();
  const about = t.profile.aboutPage;
  const rows: [string, string][] = [
    [about.nameLabel, t.common.appName],
    [about.versionLabel, version],
    [about.purposeLabel, about.purposeValue],
    [about.platformLabel, about.platformValue],
    [about.yearLabel, "2026"],
  ];

  return (
    <InfoPage title={about.title}>
      <div className="flex flex-col gap-2">
        <Logo size={22} />
        <p className="text-[14px] leading-snug">{about.body}</p>
      </div>

      <h2 className={SECTION_TITLE}>{about.infoTitle}</h2>
      <Ticket variant="sections">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-baseline justify-between gap-4 px-3.5 py-2.5 text-[14px] not-first:border-t not-first:border-dashed not-first:border-perf"
          >
            <span className="shrink-0 text-ink-2">{label}</span>
            <span className="text-right font-medium text-ink">{value}</span>
          </div>
        ))}
      </Ticket>

      <h2 className={SECTION_TITLE}>{about.creditsTitle}</h2>
      <CreditCard credit={about.vitaliy} />
      <CreditCard credit={about.eduard} />

      <p className="mt-2 text-center text-[13px] text-ink-3">{about.rights}</p>
    </InfoPage>
  );
}
