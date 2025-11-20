export const getSimilarityColor = (similarity: number): string => {
  if (similarity >= 0.8) {
    return "text-red-600 bg-red-50";
  }
  if (similarity >= 0.6) {
    return "text-orange-600 bg-orange-50";
  }
  if (similarity >= 0.4) {
    return "text-yellow-600 bg-yellow-50";
  }
  return "text-green-600 bg-green-50";
};

export const getSimilarityLabel = (similarity: number): string => {
  if (similarity >= 0.8) {
    return "Very High Risk";
  }
  if (similarity >= 0.6) {
    return "High Risk";
  }
  if (similarity >= 0.4) {
    return "Low Risk";
  }
  return "No Risk";
};

export const getRiskColor = (riskLevel: string | null): string => {
  if (riskLevel === "high") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (riskLevel === "medium") {
    return "bg-orange-100 text-orange-700 border-orange-200";
  }
  if (riskLevel === "low") {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }
  return "bg-green-100 text-green-700 border-green-200";
};

export const getRiskText = (riskLevel: string | null): string => {
  if (riskLevel === "high") {
    return "High Risk";
  }
  if (riskLevel === "medium") {
    return "Medium Risk";
  }
  if (riskLevel === "low") {
    return "Low Risk";
  }
  return "No Risk";
};
