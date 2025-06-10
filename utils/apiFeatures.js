export class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
    this.filterConditions = {};
  }

  filter() {
    let queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludedFields.forEach(el => delete queryObj[el]);

    // if (Object.keys(queryObj).length === 0) return this;

    // this.query = this.query.find(queryObj);
    this.filterConditions = { ...queryObj };
    return this;
  }

  applyFilters() {
    this.query = this.query.find(this.filterConditions);
    return this;
  }

  sort() {
    // Sorting
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  limitFields() {
    // Field Limiting
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v -createdAt -updatedAt');
    }

    return this;
  }

  paginate() {
    // Pagination
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);
    return this;
  }

  search(model) {
    if (this.queryString.search?.trim()) {
      // prettier-ignore
      const searchTerm = this.queryString.search.trim().split('/\s+/').join('|');
      const searchRegex = new RegExp(searchTerm, 'i');

      const searchConditions = model.map(field => ({
        [field]: { $regex: searchRegex },
      }));

      this.query = this.query.find({ $or: searchConditions });
    }

    return this;
  }
}
