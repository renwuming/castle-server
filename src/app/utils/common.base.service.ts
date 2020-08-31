import { Model } from "mongoose";

export default class BaseService<T = any> {
  model: Model<any>;

  constructor(model: Model<any>) {
    this.model = model;
  }

  // Get by id
  getById = async (id: ID): Promise<T> => {
    const obj = await this.model.findById(id);
    return obj;
  };

  // Get by uuid
  getByUuid = async (uuid: UUID): Promise<T | null> => {
    const obj = await this.model.findOne({ uuid });
    return obj;
  };

  // Get all
  getAll = async (): Promise<T[]> => {
    const docs = await this.model.find({});
    return docs;
  };

  find = async (query: Partial<T>): Promise<T[]> => {
    const result = await this.model.find(query);
    return result;
  };

  queryPaginate = async (
    option: PaginateQuery & {
      query?: Partial<T>;
      sortBy?: {
        [K in keyof T]?: number;
      };
    }
  ): Promise<Paginate<T>> => {
    const pageIndex = option.pageIndex - 1 || 0;
    const pageSize = option.pageSize || 10;
    const count = await this.model.countDocuments(option.query || {});
    const documentQuery: any = this.model.find(option.query || {});
    option.sortBy =
      option.sortBy ||
      ({
        _id: -1,
      } as any);
    if (option.sortBy) {
      documentQuery.sort(option.sortBy as any);
    }
    const items: T[] = await documentQuery
      .skip(pageIndex * pageSize)
      .limit(pageSize);
    return {
      pageIndex: option.pageIndex,
      pageTotal: Math.ceil(count / pageSize),
      items,
      total: count,
    };
  };

  // Count all
  count = async (): Promise<number> => {
    const count = await this.model.count({});
    return count;
  };

  // Insert
  insert = async (data: Partial<T>): Promise<T> => {
    const m = new this.model(data);

    const obj: Promise<T> = await m.save();
    return obj;
  };

  // Update by _id
  update = async (option: {
    _id: string;
    updates: Partial<T>;
  }): Promise<void> => {
    const { _id, updates } = option;
    delete (updates as any)["_id"];
    await this.model.findOneAndUpdate({ _id }, { $set: updates });
  };

  // Update by uuid
  updateByUuid = async (option: {
    uuid: UUID;
    updates: Partial<T>;
  }): Promise<void> => {
    const { uuid, updates } = option;
    delete (updates as any)["_id"];
    await this.model.findOneAndUpdate({ uuid }, { $set: updates });
  };

  // Delete by uuid
  delete = async (uuid: UUID): Promise<void> => {
    await this.model.findOneAndRemove({ uuid });
  };
}
