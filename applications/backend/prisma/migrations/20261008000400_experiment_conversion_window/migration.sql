-- Historical plans have no registered conversion window. Leave unknown rather than invent one.
ALTER TABLE "ExperimentPlan" ADD COLUMN "conversionWindowHours" INTEGER;
