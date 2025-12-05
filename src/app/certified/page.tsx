"use client";

import Header from "@/app/components/Header";
import { useTheme } from "@/app/contexts/ThemeContext";
import { Trophy } from "lucide-react";

export default function CertifiedPage() {
	const { darkMode } = useTheme();

	return (
		<div className={`min-h-screen ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
			<Header />
			<main className="pt-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto">
					<section
						className={`${darkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-200 text-gray-900"} border rounded-xl shadow-sm p-6 md:p-8`}
					>
						<h1 className="text-3xl font-bold mb-3">Certified Tournaments</h1>
						<p
							className={`${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
						>
							Here are the certified tournaments from which we pull test
							questions. They have been vetted by our team for quality and upserted into our
							the Scio.ly database without any additional modifications.
						</p>
						<p
							className={`${darkMode ? "text-gray-300" : "text-gray-700"} mb-2`}
						>
							Specifically, this list contains all tournaments that granted
							permission for use of their questions or are marked public on the
							test exchange and meet our quality standards.
						</p>

						<div className="mt-4">
							<h2 className="text-xl font-semibold mb-1">Manually certified</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								{MANUAL_TOURNAMENTS.map((name) => (
									<div
										key={name}
										className={`${darkMode ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-200 text-gray-900"} border rounded-md px-4 py-2 flex items-center gap-3`}
									>
										<Trophy
											className={`w-4 h-4 ${darkMode ? "text-blue-300" : "text-blue-600"}`}
										/>
										<span className="font-medium">{name}</span>
									</div>
								))}
							</div>
						</div>

						<div className="mt-6">
							<h2 className="text-xl font-semibold mb-1">
								Public and certified tournaments
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-2">
								{PUBLIC_TOURNAMENTS.map((name) => (
									<div
										key={name}
										className={`${darkMode ? "bg-gray-700 border-gray-600 text-gray-100" : "bg-gray-50 border-gray-200 text-gray-900"} border rounded-md px-4 py-2 flex items-center gap-3`}
									>
										<Trophy
											className={`w-4 h-4 ${darkMode ? "text-blue-300" : "text-blue-600"}`}
										/>
										<span className="font-medium">{name}</span>
									</div>
								))}
							</div>
						</div>
					</section>
				</div>
			</main>
			<div className="pb-8" />
		</div>
	);
}

// Manually certified tournaments provided by organizers or curated by Scio.ly
const MANUAL_TOURNAMENTS: string[] = [
	"Arcadia High School Tryouts",
	"Athens (Twin Tiers)",
	"Battle of the Bees",
	"Belleville",
	"Blue Dragon Invitational",
	"Boyceville",
	"Camas",
	"Captain's Exchange",
	"Cerritos",
	"Chattahoochee",
	"Cheyenne Mountain",
	"Christensen",
	"Cobra",
	"Cornell",
	"Crystal Lake",
	"Cyfalls",
	"Cypress Falls",
	"Dartmouth",
	"Davidson Mini",
	"Dick Smith Memorial",
	"Dodgen Walton",
	"Eagle Invitational",
	"Eagle View",
];

// Public tournaments extracted from "Peter - Peter.csv" where Public? == TRUE
// Snapshot at creation time; source-of-truth remains the CSV/script.
const PUBLIC_TOURNAMENTS: string[] = [
	"Archimedean Invitational",
	"Aviation",
	"BEARSO",
	"BirdSO",
	"Carnegie Mellon",
	"CarSO Invitational",
	"Case Western Reserve Invitational",
	"Clio",
	"Conestoga",
	"CPCC",
	"CrabSO",
	"Crown Point Invitational",
	"Golden Gate",
	"Gopher",
	"High Desert",
	"Highlands",
	"JC Booth",
	"Johns Creek",
	"Kraemer",
	"Lexington",
	"Mason",
	"Mililani",
	"Mira Loma",
	"MIT",
	"Monta Vista",
	"Mountain House/Wicklund",
	"Muscatel",
	"National Cathedral",
	"North Pocono",
	"Northview Invitational",
	"Practice SO Tournament",
	"Ohio State",
	"Pitt",
	"Plymouth-Canton",
	"Polytechnic",
	"Princeton",
	"Redmond",
	"Rice",
	"Rickards",
	"S.O. at Columbia Invitational",
	"Scilymp Prac November",
	"Seven Lakes",
	"Sierra Vista",
	"SO Practice Nov",
	"SOAPS",
	"Socorro",
	"SOLVI/Las Vegas/Clark",
	"SOUP Invitational",
	"South Forsyth",
	"Stanford Invitational",
	"Summer Event Challenges",
	"Sylvania",
	"Texas A&M",
	"University of California Riverside Highlander Invitational",
	"University of California Chicago Invitational",
	"University of California San Diego (TritonSO)",
	"University of Georgia",
	"University of Massachusetts Ahmerst Invitational",
	"University of Maryland",
	"University of Chicago",
	"University of Florida Regionals",
	"University of Michigan",
	"University of Pennsylvania",
	"University of Texas Austin",
	"UTA Regionals",
	"Yale",
	"Yellow Jacket Invitational",
	"Yosemite",
];
