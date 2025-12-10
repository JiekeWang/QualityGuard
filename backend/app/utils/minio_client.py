"""
MinIO客户端
"""
from minio import Minio
from minio.error import S3Error
from app.core.config import settings


class MinIOClient:
    """MinIO客户端类"""
    
    def __init__(self):
        self.client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()
    
    def _ensure_bucket(self):
        """确保存储桶存在"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            print(f"Error ensuring bucket: {e}")
    
    def upload_file(self, file_path: str, object_name: str) -> str:
        """上传文件"""
        try:
            self.client.fput_object(
                self.bucket,
                object_name,
                file_path
            )
            return f"{settings.MINIO_ENDPOINT}/{self.bucket}/{object_name}"
        except S3Error as e:
            raise Exception(f"Failed to upload file: {e}")
    
    def download_file(self, object_name: str, file_path: str):
        """下载文件"""
        try:
            self.client.fget_object(
                self.bucket,
                object_name,
                file_path
            )
        except S3Error as e:
            raise Exception(f"Failed to download file: {e}")
    
    def delete_file(self, object_name: str):
        """删除文件"""
        try:
            self.client.remove_object(self.bucket, object_name)
        except S3Error as e:
            raise Exception(f"Failed to delete file: {e}")


minio_client = MinIOClient()

