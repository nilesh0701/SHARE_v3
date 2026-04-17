from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 120
    admin_email: str
    admin_password: str

    class Config:
        env_file = ".env"

settings = Settings()