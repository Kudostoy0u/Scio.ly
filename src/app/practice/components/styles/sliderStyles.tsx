export function SliderStyles({ darkMode }: { darkMode: boolean }) {
	return (
		<style>{`
      input[type="range"]::-webkit-slider-thumb {
        appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: ${darkMode ? "#3b82f6" : "#2563eb"};
        cursor: pointer;
        border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      input[type="range"]::-moz-range-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: ${darkMode ? "#3b82f6" : "#2563eb"};
        cursor: pointer;
        border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }

      input[type="range"]::-moz-range-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      input[type="range"]::-ms-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: ${darkMode ? "#3b82f6" : "#2563eb"};
        cursor: pointer;
        border: 2px solid ${darkMode ? "#1f2937" : "#ffffff"};
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.2s ease;
      }

      input[type="range"]::-ms-thumb:hover {
        transform: scale(1.1);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      input[type="range"]::-webkit-slider-track {
        background: transparent;
        border: none;
      }

      input[type="range"]::-moz-range-track {
        background: transparent;
        border: none;
      }

      input[type="range"]::-ms-track {
        background: transparent;
        border: none;
      }
    `}</style>
	);
}
