"use client";

import { useAuth } from "@/app/contexts/AuthContext";
import { dismissNamePrompt, useNamePrompt } from "@/app/hooks/useNamePrompt";
import { useEffect, useState } from "react";
import NamePromptModal from "./NamePromptModal";

export default function NamePromptProvider() {
	const { user } = useAuth();
	const { needsPrompt, currentName, currentEmail, isLoading } = useNamePrompt();
	const [showModal, setShowModal] = useState(false);
	const [hasShownPrompt, setHasShownPrompt] = useState(false);

	useEffect(() => {
		// Only show prompt if user is logged in, needs a prompt, and we haven't shown it yet
		if (user && needsPrompt && !isLoading && !hasShownPrompt) {
			// Add a small delay to avoid showing immediately on page load
			const timer = setTimeout(() => {
				setShowModal(true);
				setHasShownPrompt(true);
			}, 2000);

			return () => clearTimeout(timer);
		}
		return undefined;
	}, [user, needsPrompt, isLoading, hasShownPrompt]);

	const handleClose = () => {
		setShowModal(false);
		if (user) {
			dismissNamePrompt(user.id);
		}
	};

	// The modal handles saving and closing itself

	if (!user || isLoading) {
		return null;
	}

	return (
		<NamePromptModal
			isOpen={showModal}
			onClose={handleClose}
			currentName={currentName}
			currentEmail={currentEmail}
		/>
	);
}
