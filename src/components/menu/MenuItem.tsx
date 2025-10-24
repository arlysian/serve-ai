import { MenuItem as ItemType, Restaurant } from "@/types/menu";
import Image from "next/image";

export default function MenuItem({
  item,
  restaurant,
}: {
  item: ItemType;
  restaurant: Restaurant;
}) {
  const cardColor = restaurant.theme?.card_color || "#ffffff";
  const textColor = restaurant.theme?.text_color || "#000000";

  return (
    <div
      className="rounded-xl shadow-sm p-3 flex flex-col items-center"
      style={{ backgroundColor: cardColor, color: textColor }}
    >
      <Image
        src={item.image_url || "/placeholder.png"}
        alt={item.name}
        width={96}
        height={96}
        className="w-24 h-24 object-cover rounded-lg mb-2"
      />
      <p className="font-semibold text-center text-sm">{item.name}</p>
      <p className="text-sm font-semibold text-center">€{item.price}</p>
    </div>
  );
}
