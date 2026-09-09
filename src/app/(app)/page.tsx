import { HomeHeader } from "@/components/home/HomeHeader";
import { WorkTimeCard } from "@/components/home/WorkTimeCard";
import { ObjectCard } from "@/components/shared/ObjectCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { fmt, formatDateLong } from "@/lib/format";
import { t } from "@/lib/i18n";
import { homeObjects } from "@/lib/mock/objects";
import { createClient } from "@/lib/supabase/server";
import { initialsOf, requireProfile } from "@/modules/auth/session";
import { getOpenEntry } from "@/modules/entries/queries";

export default async function HomePage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const openEntry = await getOpenEntry(supabase, profile.id);

  return (
    <div className="px-4 pb-6">
      <HomeHeader initials={initialsOf(profile)} />

      <div className="mt-6">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
          {fmt(t.home.greeting, { name: profile.full_name })}
        </h1>
        <p className="mt-1 text-[15px] font-medium text-text-muted">
          {formatDateLong(new Date())}
        </p>
      </div>

      <WorkTimeCard className="mt-5" openEntry={openEntry} />

      <SectionHeader
        className="mt-6"
        title={t.home.myObjects}
        action={{ label: t.home.viewAll, href: "/objects" }}
      />

      <div className="mt-3 space-y-3">
        {homeObjects.map((object) => (
          <ObjectCard key={object.id} object={object} />
        ))}
      </div>
    </div>
  );
}
