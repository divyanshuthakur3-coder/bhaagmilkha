-- Migration to add weather column to runs table
ALTER TABLE runs ADD COLUMN weather VARCHAR(100) DEFAULT NULL AFTER shoe_id;
