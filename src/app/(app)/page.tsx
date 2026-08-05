import { HomeHeader } from "@/components/home/HomeHeader";
import { WorkTimeCard } from "@/components/home/WorkTimeCard";
import { ObjectCard } from "@/components/shared/ObjectCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { fmt, formatDateLong } from "@/lib/format";
import { t } from "@/lib/i18n";
import { homeObjects } from "@/lib/mock/objects";
import { TODAY, currentUser } from "@/lib/mock/user";

export default function HomePage() {
  return (
    <div className="px-4 pb-6">
      <HomeHeader />

      <div className="mt-6">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight">
          {fmt(t.home.greeting, { name: currentUser.name })}
        </h1>
        <p className="mt-1 text-[15px] font-medium text-text-muted">
          {formatDateLong(TODAY)}
        </p>
      </div>

      <WorkTimeCard className="mt-5" />

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
