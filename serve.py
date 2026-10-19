"""Container entry point: migrate once, then run one budget-limited process."""
import os
import uvicorn
from backend.app import Settings
from backend.database import Database
from backend.migrate import migrate_engine

if __name__ == '__main__':
    os.umask(0o077)
    settings=Settings.environment()
    database=Database(settings.database_url)
    try:migrate_engine(database.engine)
    finally:database.close()
    uvicorn.run('backend.app:app',host='0.0.0.0',port=int(os.getenv('PORT','8000')),workers=1,access_log=False,proxy_headers=False)
