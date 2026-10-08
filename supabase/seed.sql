INSERT INTO releases(id,name,due_date,capacity_days) VALUES
 ('10000000-0000-0000-0000-000000000001','Spring service release',current_date+14,12),
 ('10000000-0000-0000-0000-000000000002','Partner onboarding',current_date-3,6) ON CONFLICT DO NOTHING;
INSERT INTO features(id,reference,name,description,owner,status,release_id,reach,impact,confidence,effort_days,last_reviewed) VALUES
 ('20000000-0000-0000-0000-000000000001','HAR-101','Usage export','Usage records for operators','Mere','in_progress','10000000-0000-0000-0000-000000000001',80,3,0.8,5,current_date-4),
 ('20000000-0000-0000-0000-000000000002','HAR-102','Usage consent review','Review which usage fields need retention limits','Aroha','planned','10000000-0000-0000-0000-000000000001',40,4,0.9,3,current_date-20),
 ('20000000-0000-0000-0000-000000000003','HAR-103','Partner welcome pack','Internal readiness checklist','','planned','10000000-0000-0000-0000-000000000002',12,2,0.7,8,NULL),
 ('20000000-0000-0000-0000-000000000004','HAR-104','Account handover','Handover notes for service owners','Hemi','backlog',NULL,30,2,0.5,2,current_date-35),
 ('20000000-0000-0000-0000-000000000005','HAR-105','Service history','Read past service events','Mere','shipped','10000000-0000-0000-0000-000000000001',50,2,0.8,4,current_date-2) ON CONFLICT DO NOTHING;
INSERT INTO dependencies(feature_id,blocker_id) VALUES('20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO feedback(id,feature_id,organisation,summary,personal,purpose,review_on,legal_hold) VALUES
 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Harbour Services','Need usage history for monthly reviews',false,'Product research',current_date+60,false),
 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Koru Support','Interview notes contain personal details',true,'Assess retention controls',current_date-2,false),
 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000004','Harbour Services','Dispute evidence retained on legal advice',true,'Documented dispute hold',current_date-10,true) ON CONFLICT DO NOTHING;
INSERT INTO decisions(id,feature_id,revision,outcome,reason,actor) VALUES
 ('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',1,'approve','Pilot evidence checked','Demo owner'),
 ('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002',1,'defer','Needs privacy owner review','Demo owner') ON CONFLICT DO NOTHING;
