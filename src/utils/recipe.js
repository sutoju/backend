import fetch from 'node-fetch';
import querystring from 'querystring';

const FOOD2FORK_API_KEY = process.env.FOOD2FORK_API_KEY;

export function searchRecipes(items) {
  const urlBase = 'http://food2fork.com/api/search?';
  const params = {
    key: FOOD2FORK_API_KEY,
    q: items.join(','),
  };

  const url = urlBase + querystring.stringify(params);

  return fetch(url)
    .then(res => res.json())
    .then((res) => {
      const recipes = res.recipes;

      if (recipes) {
        return {
          recipes: recipes.map(i => ({
            title: i.title,
            image_url: i.image_url,
            recipe_id: i.recipe_id,
          })),
        };
      }

      return { recipes: [] };
    });
}

export function getRecipe(id) {
  const urlBase = 'http://food2fork.com/api/get?';
  const params = {
    key: FOOD2FORK_API_KEY,
    rId: id,
  };

  const url = urlBase + querystring.stringify(params);

  return fetch(url)
    .then(res => res.json())
    .then(res => ({
      ingredients: res.recipe ? res.recipe.ingredients : [],
    }));
}
/*
searchRecipes(['banana', 'apple', 'pork']).then((items) => {
  console.log(items);
});


getRecipe('43747').then((res) => {
  console.log(res);
});*/

