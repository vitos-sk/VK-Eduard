import { describe, expect, it } from "vitest";

import { isSitePhotoPath, sitePhotoPath } from "./photoPath";

const company = "11111111-1111-4111-8111-111111111111";
const site = "22222222-2222-4222-8222-222222222222";
const file = "33333333-3333-4333-8333-333333333333";

describe("sitePhotoPath / isSitePhotoPath", () => {
  it("собранный путь проходит проверку", () => {
    expect(isSitePhotoPath(sitePhotoPath(company, site, file), company, site)).toBe(true);
  });

  it("чужой объект или чужая фирма не проходят", () => {
    const path = sitePhotoPath(company, site, file);

    expect(isSitePhotoPath(path, company, "99999999-9999-4999-8999-999999999999")).toBe(false);
    expect(isSitePhotoPath(path, "99999999-9999-4999-8999-999999999999", site)).toBe(false);
  });

  it("не uuid в имени файла, другое расширение, лишний уровень и обход папок не проходят", () => {
    expect(isSitePhotoPath(`${company}/${site}/photo.webp`, company, site)).toBe(false);
    expect(isSitePhotoPath(`${company}/${site}/${file}.png`, company, site)).toBe(false);
    expect(isSitePhotoPath(`${company}/${site}/sub/${file}.webp`, company, site)).toBe(false);
    expect(isSitePhotoPath(`${company}/${site}/../${file}.webp`, company, site)).toBe(false);
    expect(isSitePhotoPath("", company, site)).toBe(false);
  });
});
