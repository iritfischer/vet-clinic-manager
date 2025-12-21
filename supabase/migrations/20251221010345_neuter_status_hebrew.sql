-- המרת ערכי neuter_status מאנגלית לעברית
UPDATE pets
SET neuter_status = CASE
  WHEN neuter_status = 'neutered' AND sex = 'female' THEN 'מעוקרת'
  WHEN neuter_status = 'neutered' AND sex = 'male' THEN 'מסורס'
  WHEN neuter_status = 'neutered' THEN 'מסורס'
  WHEN neuter_status = 'intact' AND sex = 'female' THEN 'לא מעוקרת'
  WHEN neuter_status = 'intact' AND sex = 'male' THEN 'לא מסורס'
  WHEN neuter_status = 'intact' THEN 'לא מסורס'
  ELSE neuter_status
END
WHERE neuter_status IN ('neutered', 'intact');
