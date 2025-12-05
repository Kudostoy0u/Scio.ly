"use client";
import testimonialsData from "@/../public/testimonials.json";
import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";

interface Testimonial {
	quote: string;
	student: string;
	school: string;
}

interface TestimonialsSectionProps {
	darkMode: boolean;
}

export function TestimonialsSection({ darkMode }: TestimonialsSectionProps) {
	const [emblaRefTestimonials] = useEmblaCarousel({ loop: true }, [Autoplay()]);

	return (
		<section className={`pt-8 pb-8 px-4 sm:px-6 lg:px-8 ${darkMode ? "bg-[#020617]" : "bg-white"}`}>
			<div className="max-w-7xl mx-auto">
				<h2
					className={`text-4xl font-bold mb-8 ${darkMode ? "text-white" : "text-gray-900"}`}
				>
					Testimonials
				</h2>
				<div className="embla" ref={emblaRefTestimonials}>
					<div className="embla__container">
						{(testimonialsData as Testimonial[]).map((testimonial, index) => (
							<div
								className="embla__slide p-4"
								key={`testimonial-${index}-${testimonial.student || index}`}
							>
								<div
									className={`p-6 md:p-8 rounded-2xl border h-[280px] flex flex-col justify-between ${darkMode ? "bg-gray-800/50 border-gray-700/50" : "bg-white border-gray-200"}`}
								>
									<p
										className={`${darkMode ? "text-gray-300" : "text-gray-700"} italic text-sm md:text-base`}
									>
										&quot;{testimonial.quote}&quot;
									</p>
									<div className="mt-4">
										<h4
											className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}
										>
											{testimonial.student}
										</h4>
										<p
											className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
										>
											{testimonial.school}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
