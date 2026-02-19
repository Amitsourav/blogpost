import { CMSConnection } from '@prisma/client';
import { ICMSAdapter } from './cms-adapter.interface';
import { NotionAdapter } from './notion/notion.adapter';

export function getCMSAdapter(connection: CMSConnection): ICMSAdapter {
  switch (connection.provider) {
    case 'notion':
      return new NotionAdapter(
        connection.accessToken,
        connection.contentDatabaseId,
        connection.triggerDatabaseId
      );
    default:
      throw new Error(`Unsupported CMS provider: ${connection.provider}`);
  }
}
