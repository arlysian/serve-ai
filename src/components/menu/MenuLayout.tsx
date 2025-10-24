import { Restaurant } from "@/types/menu";
import Image from "next/image";

export default function MenuLayout({
  restaurant,
  children,
}: {
  restaurant: Restaurant;
  children: React.ReactNode;
}) {
  const theme = restaurant.theme || {};
  const primary = theme.primary_color || "#e48c58";
  const secondary = theme.secondary_color || "#7a4f00";
  const textColor = theme.text_color || "#000000";

  return (
    <div
      className="min-h-screen flex flex-col items-center"
      style={{
        background: `linear-gradient(180deg, ${primary}, #f5d876)`,
      }}
    >
      <div className="w-full max-w-md px-4 pt-6">
        {/* ✅ Logo */}
        {restaurant.logo_url && (
          <div className="flex justify-center mb-4">
            <Image
              src={`${restaurant.logo_url}?v=${Date.now()}`}
              alt={restaurant.name}
              width={135}
              height={135}
              className="object-contain"
              priority
            />
          </div>
        )}

        {/* ✅ Ask AI Button */}
        <div className="w-full flex justify-center mb-8">
          <button
            className="w-[85%] h-12 rounded-full flex items-center justify-end pr-6 font-bold text-lg shadow-md"
            style={{ backgroundColor: secondary, color: "#ffffff" }}
          >
            Ask AI
          </button>
        </div>

        {/* ✅ Menu content (passes restaurant down via children) */}
        <main className="space-y-10" style={{ color: textColor }}>
          {children}
        </main>
      </div>
    </div>
  );
}
