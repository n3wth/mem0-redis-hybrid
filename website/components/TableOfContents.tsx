"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents() {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const pathname = usePathname();

  useEffect(() => {
    const getHeadings = () => {
      const elements = document.querySelectorAll("main h2, main h3");
      const items: TOCItem[] = [];
      const idCounts: Record<string, number> = {};

      elements.forEach((element) => {
        const baseId =
          element.id ||
          element.textContent?.toLowerCase().replace(/\s+/g, "-") ||
          "";

        // Track how many times we've seen this ID
        if (idCounts[baseId]) {
          idCounts[baseId]++;
        } else {
          idCounts[baseId] = 1;
        }

        // Make ID unique if we've seen it before
        const id =
          idCounts[baseId] > 1 ? `${baseId}-${idCounts[baseId] - 1}` : baseId;
        element.id = id;

        items.push({
          id,
          text: element.textContent || "",
          level: element.tagName === "H2" ? 2 : 3,
        });
      });

      setHeadings(items);
    };

    // Wait for content to load
    setTimeout(getHeadings, 100);
  }, [pathname]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-100px 0px -70% 0px" },
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-white">On this page</h4>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <a
            key={heading.id}
            href={`#${heading.id}`}
            className={`
              block text-sm transition-colors
              ${heading.level === 3 ? "ml-4" : ""}
              ${
                activeId === heading.id
                  ? "text-blue-400 font-medium"
                  : "text-gray-500 hover:text-gray-300"
              }
            `}
            onClick={(e) => {
              e.preventDefault();
              document.getElementById(heading.id)?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          >
            {heading.text}
          </a>
        ))}
      </nav>
    </div>
  );
}
