export type NetWeightInput = {
  grossWeight: number;
  spoolsCount: number;
  spoolWeight: number;
  bagWeight: number;
};

export type NetWeightBreakdown = {
  grossWeight: number;
  spoolsCount: number;
  spoolWeight: number;
  bagWeight: number;
  spoolsTotalWeight: number;
  netWeight: number;
};

const normalize = (value: number) => (Number.isFinite(value) ? value : 0);

export function calculateNetWeight(input: NetWeightInput): NetWeightBreakdown {
  const grossWeight = normalize(input.grossWeight);
  const spoolsCount = normalize(input.spoolsCount);
  const spoolWeight = normalize(input.spoolWeight);
  const bagWeight = normalize(input.bagWeight);
  const spoolsTotalWeight = spoolsCount * spoolWeight;
  const netWeight = grossWeight - spoolsTotalWeight - bagWeight;

  return {
    grossWeight,
    spoolsCount,
    spoolWeight,
    bagWeight,
    spoolsTotalWeight,
    netWeight,
  };
}
