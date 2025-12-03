"use client";

export function SliderStyles() {
	return (
		<style>{`
      .slider-dark::-webkit-slider-thumb {
        appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 2px solid #1F2937;
      }
      
      .slider-light::-webkit-slider-thumb {
        appearance: none;
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #2563EB;
        cursor: pointer;
        border: 2px solid #FFFFFF;
      }
      
      .slider-dark::-moz-range-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #3B82F6;
        cursor: pointer;
        border: 2px solid #1F2937;
      }
      
      .slider-light::-moz-range-thumb {
        height: 20px;
        width: 20px;
        border-radius: 50%;
        background: #2563EB;
        cursor: pointer;
        border: 2px solid #FFFFFF;
      }
    `}</style>
	);
}
