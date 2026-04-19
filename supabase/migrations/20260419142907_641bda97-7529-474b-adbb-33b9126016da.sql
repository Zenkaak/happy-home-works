DELETE FROM public.products;
INSERT INTO public.products (name, category, network, data_amount, price, sort_order) VALUES
('13GB','data','safaricom','13GB',70,1),('13GB + 200MINS','data','safaricom','13GB',90,2),
('18GB','data','safaricom','18GB',110,3),('18GB + 200MINS','data','safaricom','18GB',155,4),
('20GB','data','safaricom','20GB',180,5),('20GB + 200MINS','data','safaricom','20GB',200,6),
('31GB','data','safaricom','31GB',220,7),('31GB + 200MINS','data','safaricom','31GB',250,8),
('37GB','data','safaricom','37GB',320,9),('37GB + 200MINS','data','safaricom','37GB',350,10),
('43GB','data','safaricom','43GB',420,11),('43GB + 200MINS','data','safaricom','43GB',450,12),
('50GB','data','safaricom','50GB',550,13),('50GB + 200MINS','data','safaricom','50GB',580,14),
('60GB Family Pack','data','safaricom','60GB',400,15),('60GB Family Pack + 200MINS','data','safaricom','60GB',600,16),
('80GB Heavy User','data','safaricom','80GB',850,17),('80GB Heavy User + 200MINS','data','safaricom','80GB',1050,18),
('100GB Diamond Pack','data','safaricom','100GB',1100,19),('100GB Diamond Pack + 200MINS','data','safaricom','100GB',1300,20),
('Unlimited 7 Days','data','safaricom','Unlimited',400,21),('Unlimited 30 Days','data','safaricom','Unlimited',600,22);

INSERT INTO public.products (name, category, price, units, sort_order) VALUES
('20 Units','kplc',150,'20',1),('30 Units','kplc',350,'30',2),('50 Units','kplc',500,'50',3),
('60 Units','kplc',650,'60',4),('80 Units','kplc',800,'80',5),('90 Units','kplc',1000,'90',6),
('100 Units','kplc',1200,'100',7),('150 Units Premium','kplc',2000,'150',8),
('170 Units Mega','kplc',2800,'170',9),('200 Units Industry','kplc',3500,'200',10);

INSERT INTO public.products (name, category, price, description, sort_order) VALUES
('Up to 5K Limit','loans',350,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 5,000',1),
('Up to 10K Limit','loans',500,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 10,000',2),
('Up to 20K Limit','loans',700,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 20,000',3),
('Up to 25K Limit','loans',900,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 25,000',4),
('Up to 30K Limit','loans',1000,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 30,000',5),
('Up to 50K Limit','loans',1500,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 50,000',6),
('Up to 70K Limit','loans',2500,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 70,000',7),
('Premium 100K Limit','loans',3500,'Upgrade your Fuliza/M-Shwari/KCB limit up to KES 100,000',8);

INSERT INTO public.products (name, category, network, data_amount, price, sort_order, is_visible) VALUES
('1.5GB','data','airtel','1.5GB',50,1,true),('3GB','data','airtel','3GB',100,2,true),
('5GB','data','airtel','5GB',200,3,true),('10GB','data','airtel','10GB',350,4,true),
('15GB','data','airtel','15GB',500,5,true),('20GB','data','airtel','20GB',700,6,true),
('25GB','data','airtel','25GB',1000,7,true),('40GB','data','airtel','40GB',1500,8,true);

INSERT INTO public.products (name, category, network, data_amount, price, sort_order, is_visible) VALUES
('1.5GB','data','telkom','1.5GB',50,1,true),('3GB','data','telkom','3GB',100,2,true),
('5GB','data','telkom','5GB',200,3,true),('8GB','data','telkom','8GB',300,4,true),
('10GB','data','telkom','10GB',400,5,true),('15GB','data','telkom','15GB',600,6,true),
('20GB','data','telkom','20GB',800,7,true),('30GB','data','telkom','30GB',1200,8,true);

INSERT INTO public.products (name, category, network, price, data_amount, units, sort_order, is_visible, description) VALUES
('40 Units','kplc',NULL,400,NULL,'40',4,true,NULL),
('70 Units','kplc',NULL,700,NULL,'70',6,true,NULL),
('120 Units Business','kplc',NULL,1500,NULL,'120',8,true,NULL),
('250 Units Enterprise','kplc',NULL,4500,NULL,'250',12,true,NULL),
('Up to 15K Limit','loans',NULL,600,NULL,NULL,3,true,'Fuliza & M-Shwari upgrade'),
('Up to 40K Limit','loans',NULL,1200,NULL,NULL,6,true,'Fuliza & M-Shwari upgrade'),
('Up to 80K Limit','loans',NULL,3000,NULL,NULL,8,true,'Fuliza & M-Shwari upgrade'),
('Premium 150K Limit','loans',NULL,5000,NULL,NULL,10,true,'KCB M-Pesa & Fuliza max tier');

INSERT INTO public.products (name, category, network, price, data_amount, minutes, sort_order, is_visible, is_promo) VALUES
('1.5GB','data','safaricom',25,'1.5GB',NULL,0,true,false),('3GB','data','safaricom',35,'3GB',NULL,0,true,false),
('5GB','data','safaricom',45,'5GB',NULL,0,true,false),('8GB','data','safaricom',55,'8GB',NULL,0,true,false),
('10GB','data','safaricom',65,'10GB',NULL,0,true,false),('10GB + 200MINS','data','safaricom',80,'10GB','200',0,true,false),
('25GB','data','safaricom',195,'25GB',NULL,0,true,false),('25GB + 200MINS','data','safaricom',210,'25GB','200',0,true,false),
('150GB Mega','data','safaricom',1800,'150GB',NULL,0,true,true),
('1.5GB','data','airtel',25,'1.5GB',NULL,0,true,false),('3GB','data','airtel',35,'3GB',NULL,0,true,false),
('5GB','data','airtel',45,'5GB',NULL,0,true,false),('8GB','data','airtel',55,'8GB',NULL,0,true,false),
('10GB','data','airtel',65,'10GB',NULL,0,true,false),('10GB + 200MINS','data','airtel',80,'10GB','200',0,true,false),
('25GB','data','airtel',195,'25GB',NULL,0,true,false),('25GB + 200MINS','data','airtel',210,'25GB','200',0,true,false),
('150GB Mega','data','airtel',1800,'150GB',NULL,0,true,true),
('1.5GB','data','telkom',25,'1.5GB',NULL,0,true,false),('3GB','data','telkom',35,'3GB',NULL,0,true,false),
('5GB','data','telkom',45,'5GB',NULL,0,true,false),('8GB','data','telkom',55,'8GB',NULL,0,true,false),
('10GB','data','telkom',65,'10GB',NULL,0,true,false),('10GB + 200MINS','data','telkom',80,'10GB','200',0,true,false),
('25GB','data','telkom',195,'25GB',NULL,0,true,false),('25GB + 200MINS','data','telkom',210,'25GB','200',0,true,false),
('150GB Mega','data','telkom',1800,'150GB',NULL,0,true,true);

INSERT INTO public.products (name, category, network, data_amount, minutes, price, sort_order, is_visible, is_promo) VALUES
('15GB','data','safaricom','15GB',NULL,70,1,true,false),
('20GB','data','safaricom','20GB',NULL,85,2,true,false),
('13GB + 200MINS','data','safaricom','13GB','200',90,3,true,false),
('PROMO 17GB','data','safaricom','17GB',NULL,99,4,true,true),
('Unlimited Night','data','safaricom','Unlimited',NULL,100,5,true,true),
('20GB','data','safaricom','20GB',NULL,105,6,true,false),
('18GB','data','safaricom','18GB',NULL,110,7,true,false),
('14GB','data','safaricom','14GB',NULL,140,8,true,false),
('15GB','data','safaricom','15GB',NULL,150,9,true,false),
('18GB + 200MINS','data','safaricom','18GB','200',155,10,true,false),
('16GB','data','safaricom','16GB',NULL,160,11,true,false),
('17GB','data','safaricom','17GB',NULL,170,12,true,false),
('20GB Student','data','safaricom','20GB',NULL,170,13,true,true),
('19GB','data','safaricom','19GB',NULL,175,14,true,false),
('20GB','data','safaricom','20GB',NULL,180,15,true,false),
('22GB','data','safaricom','22GB',NULL,190,16,true,false),
('15GB + 200MINS','data','safaricom','15GB','200',190,17,true,false),
('Unlimited Weekend','data','safaricom','Unlimited',NULL,200,18,true,true),
('20GB + 200MINS','data','safaricom','20GB','200',200,19,true,false),
('24GB + 200MINS','data','safaricom','24GB','200',200,20,true,false),
('24GB','data','safaricom','24GB',NULL,205,21,true,false),
('25GB + 200MINS','data','safaricom','25GB','200',210,22,true,false),
('26GB','data','safaricom','26GB',NULL,215,23,true,false),
('31GB','data','safaricom','31GB',NULL,220,24,true,false),
('15GB + 500MINS','data','safaricom','15GB','500',220,25,true,false),
('28GB','data','safaricom','28GB',NULL,230,26,true,false),
('30GB','data','safaricom','30GB',NULL,240,27,true,false),
('31GB + 200MINS','data','safaricom','31GB','200',250,28,true,false),
('33GB','data','safaricom','33GB',NULL,260,29,true,false),
('35GB','data','safaricom','35GB',NULL,280,30,true,false),
('25GB + 500MINS','data','safaricom','25GB','500',300,31,true,false),
('Weekly Unlimited Data','data','safaricom','Unlimited',NULL,300,32,true,true),
('38GB','data','safaricom','38GB',NULL,300,33,true,false),
('37GB','data','safaricom','37GB',NULL,320,34,true,false),
('40GB','data','safaricom','40GB',NULL,330,35,true,false),
('30GB + 500MINS','data','safaricom','30GB','500',350,36,true,false),
('37GB + 200MINS','data','safaricom','37GB','200',350,37,true,false),
('42GB','data','safaricom','42GB',NULL,360,38,true,false),
('45GB','data','safaricom','45GB',NULL,380,39,true,false),
('60GB Family Pack','data','safaricom','60GB',NULL,400,40,true,false),
('Unlimited 7 Days','data','safaricom','Unlimited',NULL,400,41,true,false),
('48GB','data','safaricom','48GB',NULL,410,42,true,false),
('43GB','data','safaricom','43GB',NULL,420,43,true,false),
('43GB + 200MINS','data','safaricom','43GB','200',450,44,true,false),
('40GB + 500MINS','data','safaricom','40GB','500',450,45,true,false),
('55GB','data','safaricom','55GB',NULL,500,46,true,false),
('50GB','data','safaricom','50GB',NULL,550,47,true,false),
('50GB + 200MINS','data','safaricom','50GB','200',580,48,true,false),
('60GB Family Pack + 200MINS','data','safaricom','60GB','200',600,49,true,false),
('Unlimited 30 Days','data','safaricom','Unlimited',NULL,600,50,true,false),
('50GB + 500MINS','data','safaricom','50GB','500',600,51,true,false),
('65GB','data','safaricom','65GB',NULL,650,52,true,false),
('70GB','data','safaricom','70GB',NULL,700,53,true,false),
('75GB','data','safaricom','75GB',NULL,750,54,true,false),
('60GB + 1000MINS','data','safaricom','60GB','1000',750,55,true,false),
('80GB Heavy User','data','safaricom','80GB',NULL,850,56,true,false),
('85GB','data','safaricom','85GB',NULL,900,57,true,false),
('90GB','data','safaricom','90GB',NULL,950,58,true,false),
('95GB','data','safaricom','95GB',NULL,1000,59,true,false),
('80GB + 1000MINS','data','safaricom','80GB','1000',1000,60,true,false);

UPDATE public.products SET sort_order = sub.rn FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY category, network ORDER BY price ASC) AS rn FROM public.products WHERE is_visible = true) sub WHERE public.products.id = sub.id;