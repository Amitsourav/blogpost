import { CMSConnection } from '@prisma/client';
import { ICMSAdapter } from './cms-adapter.interface';
import { NotionAdapter } from './notion/notion.adapter';
import { ShopifyAdapter } from './shopify/shopify.adapter';

export function getCMSAdapter(connection: CMSConnection): ICMSAdapter {
  switch (connection.provider) {
    case 'notion':
      return new NotionAdapter(
        connection.accessToken,
        connection.contentDatabaseId,
        connection.triggerDatabaseId
      );
    case 'shopify': {
      const config = (connection.config ?? {}) as { storeDomain?: string };
      if (!config.storeDomain) {
        throw new Error(
          `Shopify connection ${connection.id} is missing config.storeDomain (e.g. "your-store.myshopify.com")`
        );
      }
      // contentDatabaseId doubles as the blog reference: a blog GID, a handle
      // like "news", or empty to fall back to the store's first blog.
      return new ShopifyAdapter(
        connection.accessToken,
        config.storeDomain,
        connection.contentDatabaseId
      );
    }
    default:
      throw new Error(`Unsupported CMS provider: ${connection.provider}`);
  }
}
