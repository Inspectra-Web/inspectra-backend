import { disconnect } from 'mongoose';
import { slugify } from '../helpers/slugify.js';
import Property from '../model/propertyModel.js';
import { dbConfig } from '../configuration/databaseConfiguration.js';

await dbConfig();

const seedSlugs = async () => {
  try {
    const properties = await Property.find({ slug: { $exists: false } });

    for (const property of properties) {
      const baseSlug = slugify(property.title || 'property');
      const slug = `${baseSlug}-${property._id.toString().slice(-6)}`;
      property.slug = slug;
      await property.save();
      console.log(`Updated property: ${property.title} -> ${slug}`);
    }

    console.log('Slug seeding complete!');
  } catch (error) {
    console.error('Error seeding slugs: ', error.message);
  } finally {
    await disconnect();
  }
};

seedSlugs();
