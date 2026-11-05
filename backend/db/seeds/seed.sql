-- Seed data for development

INSERT OR IGNORE INTO services (id, name, description, duration, price, category) VALUES
  ('svc-001', 'Corte de Cabello', 'Corte personalizado según tu estilo y tipo de rostro.', 45, 25.00, 'cabello'),
  ('svc-002', 'Tinte Completo', 'Coloración profesional con productos de primera calidad.', 120, 80.00, 'cabello'),
  ('svc-003', 'Manicure Clásico', 'Limpieza, forma y esmaltado de uñas.', 45, 20.00, 'uñas'),
  ('svc-004', 'Pedicure Spa', 'Tratamiento completo para pies con masaje relajante.', 60, 35.00, 'uñas'),
  ('svc-005', 'Limpieza Facial', 'Limpieza profunda y cuidado de la piel.', 60, 50.00, 'facial'),
  ('svc-006', 'Masaje Relajante', 'Masaje de cuerpo completo con aromaterapia.', 60, 65.00, 'bienestar');
