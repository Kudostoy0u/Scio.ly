"use client";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { FaBrain, FaFlask, FaLaptopCode, FaShareAlt, FaUsers } from "react-icons/fa";

interface FeaturesCarouselProps {
  darkMode: boolean;
  titleColor: string;
}

const features = [
  {
    icon: FaFlask,
    title: "Full Coverage",
    description:
      "We've acquired over a thousand tournaments worth of questions for use on this platform - much more than is publicly available",
  },
  {
    icon: FaBrain,
    title: "Smart Explanations",
    description:
      "Get instant, detailed explanations for every question using Google's Gemini 2.5 models",
  },
  {
    icon: FaUsers,
    title: "Analytics",
    description:
      "Track your progress - weekly, daily, or all-time. See how you've improved, and bookmark questions to come back to",
  },
  {
    icon: FaLaptopCode,
    title: "Study Modes",
    description:
      "Choose how you want to practice. Take a timed test similar to game day, or choose unlimited practice for an addictive experience",
  },
  {
    icon: FaShareAlt,
    title: "Share a test",
    description:
      "Share tests with teammates using unique codes. Collaborate and study together, just like in a real competition",
  },
];

export function FeaturesCarousel({ darkMode, titleColor }: FeaturesCarouselProps) {
  const [emblaRef] = useEmblaCarousel({ loop: true, direction: "rtl" }, [
    Autoplay({ playOnInit: true, delay: 3000, stopOnInteraction: false }),
  ]);

  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto relative">
        <div className="embla" ref={emblaRef} dir="rtl">
          <div className="embla__container">
            {features.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <div key={feature.title} className="embla__slide p-4">
                  <div
                    className={`p-8 rounded-2xl border h-[300px] flex flex-col items-center text-center ${darkMode ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200 shadow-lg"}`}
                  >
                    <IconComponent className={`text-4xl mb-4 ${titleColor}`} />
                    <h3
                      className={`text-2xl font-bold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}
                    >
                      {feature.title}
                    </h3>
                    <p className={`${darkMode ? "text-gray-400" : "text-gray-600"} flex-grow`}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
