import { MenuSection as SectionType, Restaurant } from "@/types/menu";
import MenuItem from "./MenuItem";

export default function MenuSection({
  section,
  restaurant,
}: {
  section: SectionType;
  restaurant: Restaurant;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2">{section.name}</h2>
      <div className="h-[2px] bg-black w-full mb-4" />

      {/* ✅ We pass restaurant here */}
      <div className="grid grid-cols-2 gap-4">
        {section.items?.map((item) => (
          <MenuItem key={item.id} item={item} restaurant={restaurant} />
        ))}
      </div>
    </section>
  );
}
