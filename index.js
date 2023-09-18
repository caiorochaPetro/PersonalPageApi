import { ApolloServer } from 'apollo-server';
import {gql} from 'apollo-server';
import { config } from 'dotenv';
import { Sequelize, DataTypes, Op} from 'sequelize';

import jwt from 'jsonwebtoken';
config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres', // Especifique o dialeto do PostgreSQL
      logging: false, // Desabilite o log das queries SQL (opcional)
    }
  );
  
  // Teste a conexão

sequelize.authenticate().then(() => {
  console.log('Conexão com o banco de dados estabelecida com sucesso.');
}).catch((error) => {
  console.error('Erro ao conectar-se ao banco de dados:', error);
});


//Definition
const Post = sequelize.define('post', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
    status: { type: DataTypes.STRING },
    link: { type: DataTypes.STRING },
    title: { type: DataTypes.STRING },
    short: {type: DataTypes.STRING},
    content: { type: DataTypes.STRING },
    createdAt: { type: DataTypes.DATE },
    updatedAt: { type: DataTypes.DATE },
  },{
    tableName: 'post',schema:'public', name:{singular:'post', plural:'posts'}, 
  });

const User = sequelize.define('user', {
    id: {type: DataTypes.INTEGER, primaryKey: true},
    name: {type: DataTypes.STRING},
    pass:{type: DataTypes.STRING},
    email: {type: DataTypes.STRING},
    createdAt: {type: DataTypes.DATE},
    updatedAt:{type: DataTypes.DATE}
  },{
    tableName: "user"
  });

const Project = sequelize.define('project',{
  id: {type: DataTypes.INTEGER, primaryKey: true},
  title: {type: DataTypes.STRING},
  content: {type: DataTypes.STRING},
  createdAt: {type: DataTypes.DATE},
  updatedAt:{type: DataTypes.DATE}
},
  {tableName: 'project'});

sequelize.sync();

// Resources
//1 

async function verifyToken (token){
  //console.log("AQUIIIIIIIIIIIIII: "+ JSON.stringify(token.user.name));
  let name = token.user.name;
  let user = await User.findOne({
    where:{
      name: name
    }
  })
  if (user!==null){
    return true
  }
  else{
    return false
  }
}

//Relations

async function resolver_getAllPosts(page, amount){
    const offset = (page - 1) * amount;
    const data = await Post.findAll({
      limit: amount,
      offset
    });
    const totalObj = await Post.findAll();
    const total = totalObj.length;
    const response = {
      posts: data,
      total: total
    }

    return response;
}

async function resolver_getOnePost(args){
  let id = args;
  let data = await Post.findByPk(id);
  return data;
}

//Backend

const resolvers = {
  Query: {
      getAllPosts: async (_,args) => {
        const {page, amount} = args;
        let data = await resolver_getAllPosts(page, amount);
        return data;
      },
      getOnePost: async (_,args) =>{
        const {id} = args;
        let data = await resolver_getOnePost(id);
        return data;
      },
      getOneUser: async (_, {input})=>{
        let {name, pass} = input;
        try{
        let user = await User.findOne({
          where:{

              name: name,
              pass: pass

          }
        });
        if(user != null){
          console.log(user.name);
          const SECRET_KEY = process.env.SECRET_KEY; 
          const token = jwt.sign({ user }, SECRET_KEY, { expiresIn: '1h' });
          return {token} ;
        }
        else{
          return null;
        }
      }
      catch(error){
        throw error;
      }
      },
      getAllProjects: async()=>{
        let obj = await Project.findAll();
        return obj;

      },
      getResearch: async (_, args) =>{
        let {key} = args;
        let posts = Post.findAll({
          where: {
            [Op.or]: [
              {
                title: {
                  [Op.like]: `%${key}%`,
                },
              }
            ],
          },
        });
        return posts;
      }
  },
  Mutation: {
      setPost: async (_, { input }, context) => {
        //console.log("AQUIIIIIIIIIIIIIIIIIIII"+context.user);
        try{
          if (verifyToken(context.user)){
            const { title, status, link, content, short, createdAt, updatedAt } = input;
            const newPost = await Post.create({
                status,
                link,
                title,
                short,
                content,
                createdAt,
                updatedAt,
            });
            return newPost;
          }
          else{
            return "Invalid Token"
          }
        }
      catch(e){
        throw e;
      }

      },
      updatePost: async (_, {input}, context)=>{
        try{
          if (verifyToken(context.user)){
            const {id, title,status, link, content, short} = input;
            const post = await Post.findByPk(id);
            post.title = title;
            post.status = status;
            post.short = short;
            post.link = link;
            post.content = content;

            await post.save();
            return post;
            //}
            //else throw "deu não";
          }
          else{
            return "Invalid Token"
          }
        }
        catch(error){
          throw error;
        }
      
      },
            
      deleteOnePost: async (_, input, context)=>{
        try{
          if (verifyToken(context.user)){
            let {id} = input;
            let object = await Post.findByPk(id);
            object.destroy({
                where: { id: id },
            });
              return object;
            }
          else{
              return "Invalid Token"
            }
          }
          catch(error){
            return error
          }
        }
    }
  
  }
        
const typeDefs = gql`
    scalar Date
    type post {
        id: Int
        status: String
        link: String
        title: String
        short: String
        content: String
        createdAt: Date
        updatedAt: Date
    }

    type postResponse {
      posts: [post]
      total: Int
    }

    type user {
      id: Int
      pass: String
      name: String
      email: String
      token: String
      createdAt: Date
      updatedAt: Date

    }

    type project {
      id: Int
      title: String
      content: String
      createdAt: Date
      updatedAt: Date
    }

    type idPick{
      id: Int
    }

    input passName{
      name: String
      pass: String
    }

    type research {
      title: String
      type: String
      link: String
    }

    type Query {
        getAllPosts(page: Int!, amount: Int!): postResponse
        getOnePost(id: Int): post
        getOneUser(input: passName): user
        getResearch(key: String): [post]
        getAllProjects: [project]
        
    }
    input inPost{
        status: String
        link: String
        title: String
        short: String
        content: String
        createdAt: Date
        updatedAt: Date
    }

    input inOnePost{
      id: Int
      status: String
      link: String
      title: String
      short: String
      content: String
      createdAt: Date
      updatedAt: Date
  }

    type Mutation{
        setPost(input: inPost!): post
        updatePost (input: inOnePost!): post
        deleteOnePost (id : Int): post
    }
`;

const SECRET_KEY = process.env.SECRET_KEY; 

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: true, // Ativa o Playground
  context: async ({ req, res }) => {
    // Verifique o token JWT no cabeçalho da solicitação
    const token = req.headers.authorization || '';
    try {
      if (!token) {
        throw new Error('Token não fornecido');
      }
      // Verifique a validade do token JWT e decodifique-o
      const user =  jwt.verify(token.replace('Bearer ', ''), SECRET_KEY);

      // Se o token for válido, retorne o usuário autenticado no contexto
      return { user };
    } catch (error) {
      // Verifique se o erro é devido ao token expirado
      if (error.name === 'TokenExpiredError') {
        return { error: 'Token expirado' };
      }
      return { error: 'Token inválido' }; // Outros erros relacionados a JWT
    }
  },
});

server.listen({port: 8080}).then(({ url }) => {
    console.log(`Servidor Apollo pronto em ${url}`);
  });