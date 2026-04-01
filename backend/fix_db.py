from app.database import engine, Base
from app import models

print("Creating all tables...")
Base.metadata.create_all(bind=engine)
print("Done.")
