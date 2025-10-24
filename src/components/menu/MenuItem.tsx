import { MenuItem as ItemType, Restaurant } from "@/types/menu";

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
      <img
        src={item.image_url || "/placeholder.png"}
        alt={item.name}
        className="w-24 h-24 object-cover rounded-lg mb-2"
      />
      <p className="font-semibold text-center text-sm">{item.name}</p>
      <p className="text-sm font-semibold text-center">€{item.price}</p>
    </div>
  );
}
