export default function AssignErrorPage() {
	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="max-w-md w-full text-center">
				<h1 className="text-2xl font-bold mb-2">Unable to load assignment</h1>
				<p className="text-gray-600">
					The assignment link may be invalid or expired.
				</p>
			</div>
		</div>
	);
}
